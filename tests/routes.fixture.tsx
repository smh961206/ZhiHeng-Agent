import React from 'react';
import {renderToPipeableStream} from 'react-dom/server';
import {PassThrough} from 'node:stream';
import {MemoryRouter,Routes,Route} from 'react-router';
import App from '../src/App';
export function renderRoute(url,path,page){
 return new Promise((resolve,reject)=>{
 const output=new PassThrough();let html='';output.on('data',chunk=>html+=chunk);output.on('end',()=>resolve(html));output.on('error',reject);
 const stream=renderToPipeableStream(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={<App page={page}/>}/></Routes></MemoryRouter>,{onAllReady(){stream.pipe(output);},onError:reject});
 });
}
