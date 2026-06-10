import { MiniNavbar } from "@/components/ui/sign-in-flow-1";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/8bit-card";

export default function BestPractices() {
  const practices = [
    { title: "Authentication", content: "Always set up SPF, DKIM, and DMARC. These are the ID cards of your email. Without them, you're just another spammer." },
    { title: "Warmup", content: "Never blast thousands of emails from a new domain. Slowly increase your volume over 4-6 weeks to build a good reputation." },
    { title: "List Cleaning", content: "Remove bounced emails immediately. Sending to invalid addresses ruins your sender score." },
    { title: "Engagement", content: "Replies are the ultimate positive signal. Try to ask questions and encourage users to reply to your emails." },
  ];

  return (
    <div className="min-h-screen bg-background retro flex flex-col items-center pt-32 px-4 pb-24">
      <MiniNavbar />
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-12 text-center uppercase">Best Practices</h1>
        <div className="space-y-6">
          {practices.map((p, i) => (
            <Card key={i} className="bg-white">
              <CardHeader>
                <CardTitle className="text-sm uppercase">Level {i+1}: {p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] leading-loose text-gray-600 uppercase">{p.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
