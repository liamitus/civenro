import { Badge } from "@/components/ui/badge";
import type { RepresentativeInfo } from "@/types";
import { partyColor, chamberLabel, nextElection } from "@/lib/representative-utils";
import { RepPhoto } from "./rep-photo";

interface RepHeroProps {
  rep: RepresentativeInfo;
}

export function RepHero({ rep }: RepHeroProps) {
  const colors = partyColor(rep.party);
  const electionCountdown = nextElection(rep.chamber);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Photo */}
      <div className="relative w-32 h-40 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-sm">
        <RepPhoto
          bioguideId={rep.bioguideId}
          firstName={rep.firstName}
          lastName={rep.lastName}
        />
      </div>

      {/* Info */}
      <div className="space-y-3">
        <div>
          <h1 className="font-gelasio text-2xl sm:text-3xl font-bold text-navy leading-tight">
            {rep.firstName} {rep.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {chamberLabel(rep.chamber)}
            {rep.district ? `, ${rep.state}-${rep.district}` : `, ${rep.state}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={colors.badge}>
            {rep.party.replace("Democratic", "Democrat")}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Next election {electionCountdown}
          </span>
        </div>

        {rep.phone && (
          <a
            href={`tel:${rep.phone}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {rep.phone}
          </a>
        )}
      </div>
    </div>
  );
}
