import {
  Receipt,
  ReceiptDivider,
  ReceiptFooter,
  ReceiptHeader,
  ReceiptItem,
  ReceiptItemAmount,
  ReceiptItemLabel,
  ReceiptItemNote,
  ReceiptItems,
  ReceiptLeader,
  ReceiptMeta,
  ReceiptTitle,
  ReceiptTotal,
  ReceiptTotalAmount,
  ReceiptTotalLabel,
} from "~/ui/receipt";

import { Section } from "./section";

export function ReceiptDemo() {
  return (
    <div className="space-y-8">
      <Section title="Receipt">
        <Receipt>
          <ReceiptHeader>
            <ReceiptTitle>Brew &amp; Butter</ReceiptTitle>
            <ReceiptMeta>128 Palm St</ReceiptMeta>
            <ReceiptMeta>Apr 28 26 · #04</ReceiptMeta>
          </ReceiptHeader>

          <ReceiptDivider />

          <ReceiptItems>
            <ReceiptItem>
              <ReceiptItemLabel>Oat mlk latte lg</ReceiptItemLabel>
              <ReceiptItemAmount>5.50</ReceiptItemAmount>
            </ReceiptItem>
            <ReceiptItem>
              <ReceiptItemLabel>Blbry muffn gltnfr</ReceiptItemLabel>
              <ReceiptItemAmount>4.25</ReceiptItemAmount>
            </ReceiptItem>
            <ReceiptItem>
              <ReceiptItemLabel>Drp cffe md</ReceiptItemLabel>
              <ReceiptItemAmount>3.75</ReceiptItemAmount>
            </ReceiptItem>
            <ReceiptItem>
              <ReceiptItemLabel>Crsnt hm chs</ReceiptItemLabel>
              <ReceiptItemAmount>6.00</ReceiptItemAmount>
            </ReceiptItem>
            <ReceiptItem>
              <ReceiptItemLabel>Mtch latte 16oz</ReceiptItemLabel>
              <ReceiptItemAmount>5.50</ReceiptItemAmount>
            </ReceiptItem>
          </ReceiptItems>

          <ReceiptDivider />

          {/* Subtotal and tax are ordinary items; only the total is heavy. They
              share one divider, which is why ReceiptTotal draws no rule. */}
          <div className="flex flex-col gap-1.5">
            <ReceiptItem>
              <ReceiptItemLabel className="text-muted-foreground">
                Subtotal
              </ReceiptItemLabel>
              <ReceiptItemAmount className="text-muted-foreground">
                25.00
              </ReceiptItemAmount>
            </ReceiptItem>
            <ReceiptItem>
              <ReceiptItemLabel className="text-muted-foreground">
                Tax 8.5%
              </ReceiptItemLabel>
              <ReceiptItemAmount className="text-muted-foreground">
                2.13
              </ReceiptItemAmount>
            </ReceiptItem>
            <ReceiptTotal>
              <ReceiptTotalLabel>Total</ReceiptTotalLabel>
              <ReceiptTotalAmount>27.13</ReceiptTotalAmount>
            </ReceiptTotal>
          </div>

          <ReceiptFooter>* Thank you *</ReceiptFooter>
        </Receipt>
      </Section>

      <Section title="With notes under a line">
        <Receipt>
          <ReceiptHeader>
            <ReceiptTitle>Post for Me</ReceiptTitle>
            <ReceiptMeta>Jul 29, 2026 · in_1TyL2M</ReceiptMeta>
          </ReceiptHeader>
          <ReceiptDivider />
          <ReceiptItems>
            <ReceiptItem>
              <ReceiptItemLabel>Social Post API Usage</ReceiptItemLabel>
              <ReceiptItemAmount>34.00</ReceiptItemAmount>
              <ReceiptItemNote>340 posts at 0.10</ReceiptItemNote>
            </ReceiptItem>
            <ReceiptItem>
              <ReceiptItemLabel>Managed System Credentials</ReceiptItemLabel>
              <ReceiptItemAmount>10.00</ReceiptItemAmount>
            </ReceiptItem>
          </ReceiptItems>
          <ReceiptDivider />
          <ReceiptTotal>
            <ReceiptTotalLabel>Total</ReceiptTotalLabel>
            <ReceiptTotalAmount>44.00</ReceiptTotalAmount>
          </ReceiptTotal>
        </Receipt>
      </Section>

      <Section title="Leaders (opt-in) — for labels long enough to lose the row">
        <Receipt>
          <ReceiptItems>
            <ReceiptItem>
              <ReceiptItemLabel>
                Bring your own social media developer credentials
              </ReceiptItemLabel>
              <ReceiptLeader />
              <ReceiptItemAmount>0.00</ReceiptItemAmount>
            </ReceiptItem>
            <ReceiptItem>
              <ReceiptItemLabel>API</ReceiptItemLabel>
              <ReceiptLeader />
              <ReceiptItemAmount>1,240.00</ReceiptItemAmount>
            </ReceiptItem>
          </ReceiptItems>
          <ReceiptDivider />
          <ReceiptTotal>
            <ReceiptTotalLabel>Total</ReceiptTotalLabel>
            <ReceiptTotalAmount>1,240.00</ReceiptTotalAmount>
          </ReceiptTotal>
        </Receipt>
      </Section>

      <Section title="Wider radius — for embedding in a card row">
        <div className="max-w-sm">
          <Receipt className="max-w-none rounded-t-xl px-6 pt-6 pb-8">
            <ReceiptHeader>
              <ReceiptTitle>Upcoming invoice</ReceiptTitle>
              <ReceiptMeta>Scheduled for Aug 29, 2026</ReceiptMeta>
            </ReceiptHeader>
            <ReceiptDivider />
            <ReceiptItems>
              <ReceiptItem>
                <ReceiptItemLabel>50 × Social Post API Usage</ReceiptItemLabel>
                <ReceiptItemAmount>5.00</ReceiptItemAmount>
              </ReceiptItem>
              <ReceiptItem>
                <ReceiptItemLabel>Pro 1K — first month</ReceiptItemLabel>
                <ReceiptItemAmount>10.00</ReceiptItemAmount>
              </ReceiptItem>
            </ReceiptItems>
            <ReceiptDivider />
            <ReceiptTotal>
              <ReceiptTotalLabel>Total</ReceiptTotalLabel>
              <ReceiptTotalAmount>15.00</ReceiptTotalAmount>
            </ReceiptTotal>
          </Receipt>
        </div>
      </Section>
    </div>
  );
}
