import type { Metadata } from 'next';
import { Suspense } from 'react';
import { allProducts, INSURERS } from '../../src/web/catalog.ts';
import { TaxPlanner } from './tax-planner.tsx';

export const metadata: Metadata = { title: 'วางแผนภาษี · Coverage' };

export default function TaxPage() {
  return (
    <>
      <h1>วางแผนภาษีด้วยประกันชีวิต</h1>
      <p className="lead">
        กรอกรายได้ทั้งปี แล้วดูว่าตอนนี้เสียภาษีเท่าไร ซื้อประกันชีวิตเพิ่มแล้วภาษีลดลงกี่บาท และแบบไหนใช้สิทธิ์นี้ได้
      </p>
      <Suspense>
        <TaxPlanner products={allProducts()} insurers={INSURERS} />
      </Suspense>
      <p className="source">
        คิดจากอัตราภาษีและค่าลดหย่อนของ
        <a href="https://rd.go.th/59670.html">กรมสรรพากร</a> (
        <a href="https://www.rd.go.th/27966.html">ค่าใช้จ่ายและลดหย่อนส่วนตัว</a>) และเงื่อนไขเบี้ยประกันตาม
        <a href="https://www.chubb.com/th-th/personal/tax-deduction-benefit.html">สรุปของชับบ์ ไลฟ์</a> ตัวเลขเป็นการประมาณ
        ไม่ใช่คำแนะนำทางภาษี ยืนยันกับกรมสรรพากร (สายด่วน 1161) ก่อนยื่นจริง
      </p>
    </>
  );
}
