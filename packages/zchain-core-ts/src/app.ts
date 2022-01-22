
import express from 'express';
import Libp2p from 'libp2p';

const app = express();

app.get('/', (req, res) => {
    res.send('Hello');
});

app.listen(5100, () => console.log('Server running'));