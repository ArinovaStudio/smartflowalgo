/** Pass the selected Pine source through this function before Vela executes it. */
export function postProcessPineScript(source: string): string {
  return source;
}

/** Run a selected script through the post processor and then Vela. */
export async function runPostProcessedPineScript(
  chart: { runIndicator: (source: string, options?: Record<string, unknown>) => Promise<any> },
  source: string,
  options: Record<string, unknown>,
) {
  try {
    const result = await chart.runIndicator(postProcessPineScript(source), options);
    if (!result?.ok) console.log(result?.error);
    return result;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
