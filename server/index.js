import express from 'express';
import { diagramsRouter } from './diagrams.js';

const app = express();

app.use('/api/diagrams', diagramsRouter);
app.use(express.json());

app.listen(9123, () => {
  console.log('kubediagrams API running on :9123');
});
