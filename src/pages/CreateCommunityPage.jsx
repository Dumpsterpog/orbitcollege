import { useNavigate } from "react-router-dom";
import { useOrbit } from "../context/OrbitContext.jsx";
import { CreateCommunity } from "../components/CreateCommunity.jsx";

export default function CreateCommunityPage() {
  const navigate = useNavigate();
  const o = useOrbit();
  return (
    <CreateCommunity
      onCreate={o.handleCreate}
      onClose={() => navigate(-1)}
      verified={o.user.verified}
      onBlocked={o.handleBlocked}
      onVerifyNow={o.goToInitialPage}
    />
  );
}
