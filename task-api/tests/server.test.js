describe('server startup', () => {
  const originalPort = process.env.PORT;

  afterEach(() => {
    process.env.PORT = originalPort;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('uses PORT from environment and logs startup', () => {
    jest.resetModules();

    const listenMock = jest.fn((port, cb) => {
      if (cb) cb();
      return { close: jest.fn() };
    });
    jest.doMock('../src/app', () => ({ listen: listenMock }));

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.PORT = '5001';

    require('../src/server');

    expect(listenMock).toHaveBeenCalledWith('5001', expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('Task API running on port 5001');

    logSpy.mockRestore();
  });

  test('defaults to port 3000 when PORT is not set', () => {
    jest.resetModules();

    const listenMock = jest.fn((port, cb) => {
      if (cb) cb();
      return { close: jest.fn() };
    });
    jest.doMock('../src/app', () => ({ listen: listenMock }));

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    delete process.env.PORT;

    require('../src/server');

    expect(listenMock).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('Task API running on port 3000');

    logSpy.mockRestore();
  });
});
