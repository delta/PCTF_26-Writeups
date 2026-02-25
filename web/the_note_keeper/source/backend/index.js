import express from 'express';
import cors from 'cors';

const app = express();
const port = 4000;

app.use(express.text())
app.use(cors())
app.get('/', (req, res) => {
  res.send('Hello World!');
});

const adminNotes = [
  {
    "id": "25e1f426-729c-4187-b2ee-188380b23bb5",
    "text": "Damn I hate UI/UX, I should hire someone for that.",
    "createdAt": "2025-01-13T11:01:01.783Z"
  },
  {
    "id": "0eb92d63-0001-458a-8b7a-56c3215f785b",
    "text": "Whiskas adult, Purepet treats, new HDMI cable, batteries at Gandhi Market",
    "createdAt": "2025-01-05T18:44:50.728Z"
  },
  {
    "id": "d9eb8df5-c292-4635-93f4-7bbe7b8657b1",
    "text": "Still thinking about that stupid argument with Shalini akka. Just apologize.",
    "createdAt": "2025-01-08T21:10:42.905Z"
  },
  {
    "id": "f50a0ffd-8664-45bc-9bf2-63dbfe9a44cb",
    "text": "That old Next.js middleware vulnerability email is still sitting in my inbox.",
    "createdAt": "2025-01-15T07:02:13.391Z"
  },
  {
    "id": "9d8ebbb8-bb94-4db2-9fa6-ab0cb7f68522",
    "text": "This admin page is a mess. Is should add tags for the notes.",
    "createdAt": "2025-01-17T14:01:02.001Z"
  },
  {
    "id": "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
    "text": "Should call Nair for some code review here https://pastebin.com/GNQ36Hn4",
    "createdAt": "2025-01-18T18:45:33.210Z"
  },
  {
    "id": "c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f",
    "text": "Backend stuff WyIvc3RhdHMiLCAiL25vdGVzIiwgIi9mbGFnIiwgIi8iXQ==",
    "createdAt": "2025-01-20T12:34:56.789Z"
  }
]

app.all('/notes', (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Implemented');
    return;
  }

  res.json(adminNotes);
});

app.get('/stats', (req, res) => {
  const stats = {
    totalUsers: 1,
    totalNotes: adminNotes.length,
    totalCharacters: adminNotes.reduce((acc, note) => acc + note.text.length, 0),
  };

  res.json(stats);
});

app.get('/flag', (_, res) => {
  const flag = process.env.FLAG;
  res.send(flag);
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
