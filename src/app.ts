// src/index.ts
import express, { Request, Response, Application } from 'express';
import config from './config';

const app: Application = express();
const port = config.port;

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to Bugoons Server');
});

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});

export default app;
