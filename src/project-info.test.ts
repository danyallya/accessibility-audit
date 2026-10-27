import {describe,expect,it} from 'vitest';
import {projectInfo} from './project-info';
describe("Accessibility Audit project contract",()=>{it('keeps locale and direction aligned',()=>{expect(projectInfo.slug).toBe("accessibility-audit");expect(projectInfo.direction).toBe(projectInfo.locale==='fa-IR'?'rtl':'ltr');expect(projectInfo.firstTask.length).toBeGreaterThan(8);});});
