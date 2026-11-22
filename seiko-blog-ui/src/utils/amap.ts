let loading: Promise<void> | undefined;

export function loadAMap(key: string): Promise<void> {
  if (window.AMap?.Map) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("高德地图加载失败"));
    };
    const timeout = window.setTimeout(fail, 15000);

    script.src = "https://webapi.amap.com/maps?v=2.0&key=" + encodeURIComponent(key);
    script.async = true;
    script.onload = () => {
      if (!window.AMap?.Map) {
        fail();
        return;
      }
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = fail;
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
