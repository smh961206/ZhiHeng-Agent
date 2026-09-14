import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,expect,it,vi} from 'vitest';
import DeleteResearchDialog from '../src/components/DeleteResearchDialog';

describe('DeleteResearchDialog',()=>{
 it('shows the saved question and requires the explicit destructive action',async()=>{
  const user=userEvent.setup();
  const onConfirm=vi.fn();
  const onClose=vi.fn();
  render(<DeleteResearchDialog job={{question:'研究腾讯的资本回报'}} pending={false} error="" onConfirm={onConfirm} onClose={onClose}/>);

  expect(screen.getByRole('alertdialog')).toHaveTextContent('研究腾讯的资本回报');
  await user.click(screen.getByRole('button',{name:'确认删除'}));
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
 });

 it('locks both actions and exposes the backend error while deletion is pending',()=>{
  render(<DeleteResearchDialog job={{question:'测试研究'}} pending error="删除失败" onConfirm={vi.fn()} onClose={vi.fn()}/>);

  expect(screen.getByRole('alert')).toHaveTextContent('删除失败');
  expect(screen.getByRole('button',{name:'保留研究'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'删除中…'})).toBeDisabled();
 });
});
