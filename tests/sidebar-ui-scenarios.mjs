import assert from 'node:assert/strict';

export function registerSidebarScenarios({test,makeJob,count,noOverflow,screenshot}) {
  const jobs=Array.from({length:4},(_,i)=>makeJob(20+i,'completed',{
    question:`侧栏研究 ${i+1}：比较公司盈利质量、现金流与股东回报，统一财报期间与价格时点，逐项核对历史趋势、估值假设和缺失数据，并保留完整的研究依据。`,
  }));
  for(const [width,height] of [[1440,900],[1440,700],[1024,560],[390,700],[844,390]]) {
    test(`sidebar-fixed-regions-${width}-${height}`,{jobs,viewport:{width,height}},async({page,requests})=>{
      await page.goto('/workbench');
      const mobile=width<1024;
      let sidebar=page.locator('.desktop-sidebar');
      if(mobile){
        await page.getByRole('button',{name:'打开导航菜单',exact:true}).click();
        sidebar=page.getByRole('dialog',{name:'研究导航',exact:true});
        await sidebar.waitFor();
      }
      const list=sidebar.locator('.rr-list');
      await count(list.locator('.rr-link'),4);
      const snapshot=()=>sidebar.evaluate(root=>{
        const box=selector=>{const r=root.querySelector(selector).getBoundingClientRect();return {y:r.y,bottom:r.bottom};};
        return {top:box('.sidebar-top'),heading:box('.rr-heading'),bottom:box('.sidebar-bottom'),
          outerScroll:root.querySelector('.sidebar-inner').scrollTop,pageScroll:document.querySelector('.page-scroll').scrollTop};
      });
      const before=await snapshot();
      assert.ok(before.top.y>=0&&before.bottom.bottom<=height+1,'Navigation and footer must fit within the viewport');
      const bounds=await list.boundingBox();
      assert.ok(bounds.height>=50,'Recent list retains a usable scroll area on short screens');
      assert.ok(bounds.y>=before.heading.bottom-1&&bounds.y+bounds.height<=before.bottom.y+1,'List stays between fixed heading and footer');
      const overflow=await list.evaluate(node=>node.scrollHeight-node.clientHeight);
      if(height<900)assert.ok(overflow>20,'Compact viewports should exercise real list overflow');
      await list.hover();await page.mouse.wheel(0,800);
      if(overflow>0)await page.waitForFunction(()=>[...document.querySelectorAll('.rr-list')].some(node=>node.clientHeight>0&&node.scrollTop>0));
      const after=await snapshot();
      assert.deepEqual(after,before,'Scrolling recent items must not move navigation, footer or page');
      await list.focus();await page.keyboard.press('Home');
      await page.waitForFunction(()=>[...document.querySelectorAll('.rr-list')].some(node=>node.clientHeight>0&&node.scrollTop===0));
      await list.locator('.rr-link').last().focus();
      const focused=await list.locator('.rr-link').last().boundingBox();
      assert.ok(focused.y<bounds.y+bounds.height&&focused.y+focused.height>bounds.y,'Keyboard focus reveals the target card');
      await noOverflow(page,`sidebar ${width}x${height}`);
      await screenshot(page,`sidebar-fixed-${width}-${height}`,mobile?'.sidebar-drawer':'.desktop-sidebar');
      // Open the last item through its native link; mobile navigation closes.
      await list.locator('.rr-link').last().press('Enter');
      await page.waitForURL(`**/research/${jobs[0].id}`);
      await page.locator('.research-detail').waitFor();
      if(mobile){
        await sidebar.waitFor({state:'hidden'});
        await page.getByRole('button',{name:'打开导航菜单',exact:true}).click();
        await sidebar.waitFor();
      }
      const active=sidebar.locator('.rr-link[aria-current=page]');
      await count(active,1);
      await page.waitForFunction(()=>[...document.querySelectorAll('.rr-list')].some(list=>{
        const active=list.querySelector('[aria-current="page"]');if(!active||!list.clientHeight)return false;
        const a=active.getBoundingClientRect(),b=list.getBoundingClientRect();return a.y<b.bottom&&a.bottom>b.y;
      }));
      const activeBox=await active.boundingBox(),listBox=await list.boundingBox();
      assert.ok(activeBox.y<listBox.y+listBox.height&&activeBox.y+activeBox.height>listBox.y,'Current research is revealed without scrolling the page');
      await count(sidebar.locator('.rr-title'),4);
      assert.equal(await active.getAttribute('title'),jobs[0].input.question,'Full title remains available when the preview is clamped');
      assert.equal(requests('POST','/api/jobs').length,0);
    });
  }
}
