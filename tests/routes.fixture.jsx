import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter,Routes,Route} from 'react-router';
import App from '../src/App';
export function renderRoute(url,path,page){
 return renderToString(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={<App page={page}/>}/></Routes></MemoryRouter>);
}
