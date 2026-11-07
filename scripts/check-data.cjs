const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const required = ['data/races.json', 'data/class/class-fighter.json', 'data/class/class-wizard.json', 'data/spells/spells-phb.json']
const missing = required.filter(file => !fs.existsSync(path.join(root, file)))
if (missing.length) {
  console.error(`Missing local rules data:\n${missing.join('\n')}\nRestore your licensed/local 5eTools data folder. See README.md.`)
  process.exitCode = 1
} else {
  for (const file of required) JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  console.log('Core local rules data is present and valid JSON.')
}
