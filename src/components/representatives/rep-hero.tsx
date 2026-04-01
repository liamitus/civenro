import { Badge } from "@/components/ui/badge";
import type { RepresentativeInfo } from "@/types";
import { partyColor, chamberLabel, nextElection } from "@/lib/representative-utils";

interface RepHeroProps {
  rep: RepresentativeInfo;
}

export function RepHero({ rep }: RepHeroProps) {
  const colors = partyColor(rep.party);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Photo */}
      <div className="relative w-32 h-40 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-sm">
        {rep.bioguideId ? (
          <img
            src={`/api/photos/${rep.bioguideId}`}
            alt={`${rep.firstName} ${rep.lastName}`}
            className="w-full h-full object-cover object-top select-none pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-medium">
            {rep.firstName?.[0]}
            {rep.lastName?.[0]}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-navy leading-tight">
            {rep.firstName} {rep.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {chamberLabel(rep.chamber)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={colors.badge}>
            {rep.party.replace("Democratic", "Democrat")}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {rep.state}
            {rep.district ? `-${rep.district}` : ""}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Next election in {nextElection(rep.chamber)}
        </p>

        {rep.link && (
          <a
            href={rep.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View full record on GovTrack &rarr;
          </a>
        )}
      </div>
    </div>
  );
}
