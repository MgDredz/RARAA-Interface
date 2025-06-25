const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.text({ type: '*/*' })); // Aceitar SPARQL queries como texto

app.post('/sparql', async (req, res) => {
  try {
    const response = await fetch("http://openmydata.dsi.uminho.pt:7200/repositories/RARAA", {
      method: 'POST',
      headers: {
        'Accept': 'application/sparql-results+json',
        'Content-Type': 'application/sparql-query'
      },
      body: req.body
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy a correr em http://localhost:${PORT}`);
});
