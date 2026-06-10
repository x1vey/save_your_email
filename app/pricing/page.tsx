import { MiniNavbar } from "@/components/ui/sign-in-flow-1";
import { Card, CardContent } from "@/components/ui/8bit-card";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background retro flex flex-col items-center pt-32 px-4 pb-24">
      <MiniNavbar />
      <Card className="max-w-md w-full p-8 bg-white text-center">
        <h1 className="text-3xl font-bold mb-6 leading-relaxed uppercase">Pricing</h1>
        <div className="text-5xl font-bold text-green-500 mb-6">$0</div>
        <CardContent>
          <p className="text-[10px] leading-loose text-gray-600 uppercase mb-8">
            Lifetime Free. No hidden fees. We believe email diagnostics should be accessible to everyone.
          </p>
          <ul className="text-left text-[8px] leading-loose uppercase space-y-4">
            <li>✓ Unlimited DMARC Scans</li>
            <li>✓ Unlimited Copy Linting</li>
            <li>✓ Deliverability Reports</li>
            <li>✓ Basic Support</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
