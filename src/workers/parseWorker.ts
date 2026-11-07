import Papa from 'papaparse';

self.onmessage = (e: MessageEvent) => {
  const { fileContent, delimiter } = e.data;

  try {
    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: delimiter || undefined,
      dynamicTyping: false
    });

    self.postMessage({
      success: true,
      data: results.data,
      meta: results.meta,
      errors: results.errors
    });
  } catch (error: any) {
    self.postMessage({
      success: false,
      error: error?.message || 'Worker parsing failed'
    });
  }
};
