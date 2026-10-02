/**
 * Compiles + links shader sources without blocking the main thread (KHR_parallel_shader_compile),
 * so the browser's program cache is warm before OGL's synchronous `new Program()` runs.
 * Without the extension this resolves immediately and OGL compiles as usual.
 */
export async function precompile(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  sources: { vertex: string; fragment: string }[],
  isCancelled: () => boolean,
): Promise<void> {
  const ext = gl.getExtension("KHR_parallel_shader_compile") as {
    COMPLETION_STATUS_KHR: number;
  } | null;
  if (!ext) return;
  const created = sources.map(({ vertex, fragment }) => {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return undefined;
    gl.shaderSource(vs, vertex);
    gl.shaderSource(fs, fragment);
    gl.compileShader(vs);
    gl.compileShader(fs);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    return { vs, fs, program };
  });
  const pending = () =>
    created.some((c) => c && !gl.getProgramParameter(c.program, ext.COMPLETION_STATUS_KHR));
  while (pending() && !isCancelled()) {
    await new Promise((resolve) => setTimeout(resolve, 32));
  }
  for (const c of created) {
    if (!c) continue;
    gl.deleteProgram(c.program);
    gl.deleteShader(c.vs);
    gl.deleteShader(c.fs);
  }
}
