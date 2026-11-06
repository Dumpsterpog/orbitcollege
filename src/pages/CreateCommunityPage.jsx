import { useNavigate } from "react-router-dom";
import { Icon, Button } from "../components/ui/Primitives.jsx";
import { Screen, Column } from "../components/ui/Layout.jsx";
import { PAUSE_BODY, PAUSE_TITLE } from "../components/CommunityPause.jsx";

export default function CreateCommunityPage() {
  const navigate = useNavigate();

  return (
    <Screen>
      <Column className="pt-16 pb-16">
        <div className="max-w-md mx-auto text-center">
          <span className="grid place-items-center w-14 h-14 mx-auto rounded-full bg-c-amber/15">
            <Icon name="info" size={26} className="text-c-amber" />
          </span>
          <h1 className="text-2xl font-bold text-ink mt-4">{PAUSE_TITLE}</h1>
          <p className="text-base text-ink-2 mt-2 leading-relaxed">{PAUSE_BODY}</p>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-7">
            <Button variant="primary" tone="blue" size="lg" className="w-full sm:flex-1"
                    onClick={() => navigate("/explore")}>
              Browse communities
            </Button>
            <Button variant="soft" size="lg" className="w-full sm:flex-1" onClick={() => navigate("/")}>
              Back
            </Button>
          </div>
        </div>
      </Column>
    </Screen>
  );
}
