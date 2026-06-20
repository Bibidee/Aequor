import type { StatementOfReasons } from "@/lib/genlayer/types";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Scale, CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  statement: StatementOfReasons;
}

export function StatementOfReasonsCard({ statement }: Props) {
  return (
    <Card variant="lime-accent">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-ink" />
          <span className="font-stamp font-bold text-sm uppercase tracking-widest">Statement of Reasons</span>
          <Badge variant="lime">GenLayer Output</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Policy Basis</div>
          <div className="font-body text-sm font-semibold text-ink border-l-2 border-judgement-blue pl-3">
            {statement.policyBasis}
          </div>
        </div>

        <div>
          <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-2">Facts Considered</div>
          <ul className="space-y-1.5">
            {statement.factsConsidered.map((fact, i) => (
              <li key={i} className="flex items-start gap-2 text-sm font-body text-ink">
                <CheckCircle size={14} className="text-success-green mt-0.5 shrink-0" />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-stamp uppercase tracking-widest text-muted-ink mb-1">Why Action Is Proportional</div>
          <div className="font-body text-sm text-ink bg-canvas border border-border-ink p-3">
            {statement.whyActionIsProportional}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <AlertCircle size={14} className={statement.appealAvailable ? "text-appeal-purple" : "text-muted-ink"} />
          <span className="text-xs font-stamp uppercase tracking-widest text-muted-ink">
            Appeal: <span className={statement.appealAvailable ? "text-appeal-purple font-bold" : "text-ink"}>
              {statement.appealAvailable ? "Available" : "Not Available"}
            </span>
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
