process.loadEnvFile('.env')
const res = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + process.env.DEEPSEEK_API_KEY,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'reply with JSON {"ok":true}' }],
    response_format: { type: 'json_object' },
  }),
})
console.log('HTTP', res.status)
const text = await res.text()
console.log(text.slice(0, 800))
