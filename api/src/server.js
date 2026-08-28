import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp(process.env);
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`RetroToons API escuchando en el puerto ${port}`);
});
