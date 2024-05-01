import express, {Express} from 'express';
import { RequestHandler, ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export type HTTP_METHOD= 'get'|'post';
//
class Server{
  private app: Express;
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
  }
  addEndpoint(endpoint: string, method: HTTP_METHOD, callback: RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>){
    this.app[method](endpoint, callback);
  }
  addWebhook(endpoint: string, callback: RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>){
    this.addEndpoint(endpoint, 'post', callback);
  }
  async start(port: number){
    return new Promise<void>((resolve, reject) => {
      try{
        this.app.listen(port, () => {
          resolve();
        });
      }catch (e: any) {
        reject(e.message);
      }
    });
  }
}

export const server= new Server();