const test = require('node:test')
const assert = require('node:assert/strict')
const { sanitizeHtml, htmlToText, stripDdbTags } = require('../lib/sheet/sanitize')

test('keeps allowed formatting and drops attributes', () => {
  assert.equal(sanitizeHtml('<p class="x" onclick="evil()">Hi <strong>there</strong></p>'), '<p>Hi <strong>there</strong></p>')
})
test('removes scripts with their content and cannot splice new tags', () => {
  assert.equal(sanitizeHtml('<p>a<script>alert(1)</script>b</p>'), '<p>ab</p>')
  const out = sanitizeHtml('<<script>x</script>img src=x onerror=alert(1)>')
  assert.ok(!/<img/i.test(out), out)
  assert.ok(!/<[a-z]+[^>]*onerror/i.test(out), out)
})
test('only https links survive', () => {
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>')
  assert.match(sanitizeHtml('<a href="https://example.com">x</a>'), /^<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">x<\/a>$/)
})
test('D&D Beyond inline tags become display text', () => {
  assert.equal(stripDdbTags('make an [action]Opportunity Attack;Opportunity Attacks[/action] now'), 'make an Opportunity Attacks now')
  assert.equal(htmlToText('<p>One&rsquo;s</p><p>Two</p>'), 'One’s\nTwo')
})
