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
      </div>
    </div>
  );
}
