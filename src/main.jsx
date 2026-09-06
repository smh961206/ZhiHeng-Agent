import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router';
import App from './App';
import './styles.css';
import './workbench.css';
import './components/research-workbench.css';
import './components/research-history.css';
import './components/research-detail.css';
createRoot(document.getElementById('root')).render(<BrowserRouter><Routes>
 <Route path="/" element={<Navigate to="/workbench" replace/>}/>
 <Route path="/workbench" element={<App page="work"/>}/>
 <Route path="/research/:jobId" element={<App page="work"/>}/>
 <Route path="/history" element={<App page="history"/>}/>
 <Route path="/framework" element={<App page="rules"/>}/>
 <Route path="*" element={<App page="missing"/>}/>
</Routes></BrowserRouter>);
