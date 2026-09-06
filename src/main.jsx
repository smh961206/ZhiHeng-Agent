import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Navigate,useLocation} from 'react-router';
import App from './App';
import './styles.css';
import './workbench.css';
import './components/research-workbench.css';
import './components/research-history.css';
import './components/research-detail.css';
import './components/research-scope.css';
function FrameworkRedirect(){const {search,hash}=useLocation();return <Navigate to={{pathname:'/',search,hash}} replace/>;}
createRoot(document.getElementById('root')).render(<BrowserRouter><Routes>
 <Route path="/" element={<App page="rules"/>}/>
 <Route path="/workbench" element={<App page="work"/>}/>
 <Route path="/research/:jobId" element={<App page="work"/>}/>
 <Route path="/history" element={<App page="history"/>}/>
 <Route path="/handbook" element={<App page="handbook"/>}/>
 <Route path="/framework" element={<FrameworkRedirect/>}/>
 <Route path="*" element={<App page="missing"/>}/>
</Routes></BrowserRouter>);
