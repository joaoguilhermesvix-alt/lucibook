import fetch from 'node:fetch';

async function test() {
  const r = await fetch('http://localhost:3000/api/analyze-face', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({imageBase64: 'somedata'})
  });
  console.log(await r.json());
}

test();
