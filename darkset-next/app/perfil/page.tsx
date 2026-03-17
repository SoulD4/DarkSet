'use client';
import PageShell from '@/components/layout/PageShell';
export default function Page() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <div className="text-5xl">👤 </div>
        <div style={{fontFamily:'Barlow Condensed,sans-serif',fontWeight:900,fontSize:'1.5rem',color:'#f0f0f2',textTransform:'uppercase'}}>
          erfil
        </div>
        <div style={{color:'#5a5a6a',fontSize:'.85rem'}}>Em breve</div>
      </div>
    </PageShell>
  );
}
