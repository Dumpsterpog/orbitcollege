import { useNavigate } from "react-router-dom";
import { useOrbit } from "../context/OrbitContext.jsx";
import { LocaliTeaScreen } from "../components/LocaliTea.jsx";

export default function TeaPage() {
  const navigate = useNavigate();
  const o = useOrbit();
  return (
    <LocaliTeaScreen
      teaPosts={o.teaPosts}
      onClose={() => navigate(-1)}
      verified={o.user.verified}
      onBlocked={o.handleBlocked}
      onPost={o.handlePostTea}
      onValidate={o.handleValidateTea}
      onComment={o.handleCommentTea}
      onReport={(label) => o.setReportTarget(label)}
      myVotes={o.myTeaVotes}
      onOpenPost={o.loadTeaComments}
      onReact={o.handleReactTea}
      myReactions={o.myTeaReactions}
      myPostIds={o.myTeaPostIds}
      myCommentIds={o.myTeaCommentIds}
      canModerate={o.isTeaModerator}
      onDeletePost={o.handleDeleteTea}
      onDeleteComment={o.handleDeleteTeaComment}
    />
  );
}
