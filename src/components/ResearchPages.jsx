import {Component,lazy,Suspense} from 'react';
import {Link} from 'react-router';
import {LoaderCircle} from 'lucide-react';
import {Button} from './ui/button';

const Workbench=lazy(()=>import('./ResearchWorkbench'));
const Detail=lazy(()=>import('./ResearchDetail'));
const Handbook=lazy(()=>import('./ResearchHandbook'));
const History=lazy(()=>import('./ResearchHistory'));

class PageBoundary extends Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(this.state.failed)return <section className="empty-state" role="alert"><h2>暂时无法打开{this.props.name}</h2><p>页面资源加载失败，请检查连接后刷新重试。</p><Button onClick={()=>window.location.reload()}>刷新重试</Button><Button asChild variant="outline"><Link to="/">返回首页</Link></Button></section>;
  return <Suspense fallback={<div className="empty-state" role="status"><LoaderCircle size={28} className="animate-spin" aria-hidden="true"/><p>正在加载{this.props.name}…</p></div>}>{this.props.children}</Suspense>;
 }
}

export function ResearchDetailPage(props){return <PageBoundary name="研究详情"><Detail {...props}/></PageBoundary>;}
export function ResearchHandbookPage(props){return <PageBoundary name="研究手册"><Handbook {...props}/></PageBoundary>;}

export function ResearchWorkbenchPage(props){return <PageBoundary name="研究工作台"><Workbench {...props}/></PageBoundary>;}
export function ResearchHistoryPage(props){return <PageBoundary name="研究记录"><History {...props}/></PageBoundary>;}
