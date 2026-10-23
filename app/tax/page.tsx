import type { Metadata } from 'next';
import { Suspense } from 'react';
import { allProducts, INSURERS } from '../../src/web/catalog.ts';
import { TaxPlanner } from './tax-planner.tsx';

export const metadata: Metadata = { title: 'วางแผนภาษี · Coverage' };

export default function TaxPage() {
  return (
    <>
      <h1>คำนวณและวางแผนภาษี ปี 2569</h1>
      <p className="lead">
        กรอกเงินได้ ภาษีที่ถูกหักไว้ และค่าลดหย่อนทีละช่อง แต่ละช่องบอกเพดานสูงสุด ว่าหักได้จริงเท่าไร และใส่เพิ่มได้อีกเท่าไร
        ท้ายหน้าบอกว่าจะได้ภาษีคืนหรือต้องจ่ายเพิ่ม
      </p>
      <Suspense>
        <TaxPlanner products={allProducts()} insurers={INSURERS} />
      </Suspense>
      <p className="source">
        อัตราภาษีจาก<a href="https://rd.go.th/59670.html">กรมสรรพากร</a> ค่าใช้จ่ายและลดหย่อนส่วนตัวจาก
        <a href="https://www.rd.go.th/27966.html">กรมสรรพากร</a> เพดานลดหย่อนปี 2569 จาก
        <a href="https://www.finnomena.com/finnomenafunds/tax-deduction-guide/">FINNOMENA</a>{' '}
        <a href="https://www.krungsri.com/th/krungsri-the-coach/taxes/tax-knowledge/tax-deduction-guide">กรุงศรี</a> และ
        <a href="https://www.scb.co.th/th/personal-banking/stories/salary-man/tax-planning-2026">SCB</a> ประกันสังคมจาก
        <a href="https://flowaccount.com/blog/new-social-security-ceiling-2026/">FlowAccount</a> เงื่อนไขเบี้ยประกันจาก
        <a href="https://www.chubb.com/th-th/personal/tax-deduction-benefit.html">ชับบ์ ไลฟ์</a> ยังไม่รวม SSF ค่าลดหย่อนเฉพาะกิจอื่น
        และเงินได้ประเภทอื่นนอกจาก 40(1) 40(2) ตัวเลขเป็นการประมาณ ไม่ใช่คำแนะนำทางภาษี ยืนยันกับกรมสรรพากร (สายด่วน 1161)
        ก่อนยื่นจริง
      </p>
    </>
  );
}
