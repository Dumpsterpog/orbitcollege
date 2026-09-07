import { useNavigate } from "react-router-dom";
import { useOrbit } from "../context/OrbitContext.jsx";
import { SearchOverlay } from "../components/SearchOverlay.jsx";

export default function SearchPage() {
  const navigate = useNavigate();
  const o = useOrbit();
  return (
    <SearchOverlay
      communities={o.allGroups}
      onOpen={o.setSelectedCommunity}
      onClose={() => navigate(-1)}
    />
  );
}
