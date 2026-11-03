type Entry = {
  controller: AbortController;
  promise: Promise<unknown>;
  consumers: number;
  settled: boolean;
};

export function abortError() {
  return new DOMException("Request canceled", "AbortError");
}

/** Share only pending reads. Each caller owns its cancellation subscription. */
export class InFlightRequests {
  private entries = new Map<string, Entry>();

  clear() {
    // Existing subscribers may finish; subsequent reads must start fresh.
    this.entries.clear();
  }

  run<T>(key: string, load: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(abortError());
    let entry = this.entries.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, promise: Promise.resolve(), consumers: 0, settled: false };
      const pending = entry;
      pending.promise = Promise.resolve().then(() => {
        if (controller.signal.aborted) throw abortError();
        return load(controller.signal);
      }).finally(() => {
        pending.settled = true;
        if (this.entries.get(key) === pending) this.entries.delete(key);
      });
      this.entries.set(key, pending);
    }
    const pending = entry;
    pending.consumers++;
    return new Promise<T>((resolve, reject) => {
      let finished = false;
      const release = () => {
        if (finished) return false;
        finished = true;
        signal?.removeEventListener("abort", cancel);
        pending.consumers--;
        if (!pending.settled && pending.consumers === 0) {
          if (this.entries.get(key) === pending) this.entries.delete(key);
          pending.controller.abort();
        }
        return true;
      };
      const cancel = () => { if (release()) reject(abortError()); };
      signal?.addEventListener("abort", cancel, { once: true });
      pending.promise.then(
        value => { if (release()) resolve(value as T); },
        error => { if (release()) reject(error); }
      );
    });
  }
}

/** A sequence guard also protects against transports that cannot be interrupted. */
export class LatestRequest {
  private controller?: AbortController;

  start() {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;
    return {
      signal: controller.signal,
      isCurrent: () => this.controller === controller && !controller.signal.aborted,
    };
  }

  cancel() {
    this.controller?.abort();
    this.controller = undefined;
  }
}
