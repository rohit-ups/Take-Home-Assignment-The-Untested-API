/*
 * File Role:
 * This suite validates bootstrap behavior exposed by src/app.js startServer().
 * It verifies startup wiring without opening real sockets.
 */

const app = require('../src/app');

/**
 * @param {void} _unused - No direct inputs; each test configures spies explicitly.
 * @returns {void}
 * @behavior Groups startup behavior checks that protect production entrypoint assumptions.
 */
describe('app bootstrap', () => {
  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Verifies explicit port startup path and startup log side-effect.
   */
  test('startServer delegates to app.listen and logs startup message', () => {
    // jest.spyOn (rather than plain jest.fn) wraps existing methods and allows restoration
    // to original implementations after test completion.
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
      // Callback is invoked synchronously so assertions can run immediately in this unit test.
      callback();
      return { close: jest.fn() };
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const server = app.startServer(4321);

    expect(listenSpy).toHaveBeenCalledWith(4321, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('Task API running on port 4321');
    expect(server).toBeDefined();

    // Restore originals so this test does not leak mocked behavior into other suites.
    listenSpy.mockRestore();
    logSpy.mockRestore();
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Verifies default-port fallback branch used when startServer receives no argument.
   */
  test('startServer uses default port when no argument is provided', () => {
    const expectedPort = process.env.PORT || 3000;
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
      // Synchronous callback execution keeps bootstrap assertion timing deterministic.
      callback();
      return { close: jest.fn() };
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    app.startServer();

    expect(listenSpy).toHaveBeenCalledWith(expectedPort, expect.any(Function));

    // Always restore spies to avoid hidden coupling between test files.
    listenSpy.mockRestore();
    logSpy.mockRestore();
  });
});
