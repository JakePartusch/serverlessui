const { system, filesystem } = require('gluegun')

const src = filesystem.path(__dirname, '..')

const cli = async (cmd: string) =>
  system.run('node ' + filesystem.path(src, 'bin', 'cli') + ` ${cmd}`)

test('outputs version', async () => {
  const output = await cli('--version')
  expect(output).toContain('0.0.2')
})

test('outputs help', async () => {
  const output = await cli('--help')
  expect(output).toContain('0.0.2')
})

test('deploy', async () => {
  const output = await cli('deploy --domain=foo.com')
  expect(output).toContain('foo.com')
})
