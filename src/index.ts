import express, { NextFunction } from 'express';
import { rootHandler, helloHandler } from './handlers';
import bodyParser from 'body-parser'
import log4js from 'log4js';

log4js.configure({
    appenders: { logger: { type: "file", filename: "server.log" } },
    categories: { default: { appenders: ["logger"], level: "debug" } }
});

const logger = log4js.getLogger("logger");

const app = express();
const port = process.env.PORT || '8000';

const loggerMW = (req: express.Request, res: express.Response, next: NextFunction) => {
    logger.debug('request: ', req.method, req.url,  req.body)

    const oldWrite = res.write;
    const oldEnd = res.end;
    const chunks:any[] = [];

    res.write = function (chunk: any) {
        chunks.push(chunk);
        const args: any = arguments;
        return oldWrite.apply(res, args);
    };

    res.end = function (chunk: any) {
        if (chunk)
            chunks.push(chunk);

        const body = Buffer.concat(chunks).toString('utf8');
        logger.debug('response:', req.method, req.url, body);
        const args: any = arguments;
        oldEnd.apply(res, args);
    };
    next()
}

const authMW = (req: express.Request, res: express.Response, next: NextFunction)=> {
    const apiKey = req.header('X-Gateway_ApiKey')
    const csrfToken = req.header('csrf-token')
    if(apiKey != 'MY-KEY' || !csrfToken ) {
        res.status(400)
        res.json({error: 'Unauthorized request'})
    } else {
        next()
    }
}

app.use(bodyParser.json())
app.use('/todo/App/api/todos', loggerMW, authMW)
app.use('/todo/App/api/todo', loggerMW, authMW)

interface Todo {
    id?: number;
    text?: string;
}


const todos: Todo[] = [];

app.get('/todo/App/api/todos', (req, res)=> {
    return res.json(todos)
})

app.get('/todo/App/api/health', (req, res)=> {
    return res.json({health: 'Good'})
})  

app.post('/todo/App/api/todo', (req, res)=> {
    const todo: Todo = req.body;
    todo.id = todos.length + 1
    todos.push(todo);
    return res.json(todo)
})


app.get('/', rootHandler);
app.get('/hello/:name', helloHandler);


app.listen(port, err => {
    if (err) return console.error(err);
    return console.log(`Server is listening on ${port}`);
});