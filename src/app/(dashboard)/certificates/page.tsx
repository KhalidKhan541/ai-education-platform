'use client';

import { useEffect } from 'react';
import { useCertificateStore } from '@/store';
import { CertificateCard } from '@/components/certificates/certificate-card';
import { Award, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CertificatesPage() {
  const { certificates, fetchCertificates } = useCertificateStore();

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Certificates</h2>
          <p className="mt-1 text-sm text-slate-500">
            {certificates.length} certificates earned
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download All
        </Button>
      </div>

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
          <Award className="h-16 w-16 text-slate-300" />
          <h3 className="mt-4 text-xl font-medium text-slate-900">No certificates yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Complete courses to earn recognized certificates
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
