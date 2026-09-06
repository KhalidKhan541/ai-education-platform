'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Award, Download, ExternalLink, Share2 } from 'lucide-react';
import type { Certificate } from '@/types';

interface CertificateCardProps {
  certificate: Certificate;
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg">
      {/* Certificate Preview */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-indigo-50 p-8">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-100/50" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-indigo-100/50" />
        
        <div className="relative text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500">
            <Award className="h-6 w-6 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Certificate of Completion
          </p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">{certificate.courseName}</h3>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
          <p className="mt-3 text-xs text-slate-500">
            Issued {new Date(certificate.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Credential ID</span>
            <span className="font-mono text-xs text-slate-700">{certificate.credentialId}</span>
          </div>
        </div>

        {certificate.skills.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Skills Validated</p>
            <div className="flex flex-wrap gap-1.5">
              {certificate.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={certificate.verificationUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Verify
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
