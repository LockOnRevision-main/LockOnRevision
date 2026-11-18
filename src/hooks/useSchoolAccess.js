import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";
import { isStaffRole } from "../../shared/expertMessaging.js";

export function useSchoolAccess(uid) {
  const [state, setState] = useState({
    loading: Boolean(uid),
    staffSchools: [],
    studentSchools: [],
  });

  useEffect(() => {
    if (!uid || !db) {
      setState({ loading: false, staffSchools: [], studentSchools: [] });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "memberships"), where("uid", "==", uid)));
        const rows = snap.docs
          .map((d) => d.data() || {})
          .filter((m) => m.status === "active" && m.schoolId && m.schoolId !== "academy");
        if (cancelled) return;
        setState({
          loading: false,
          staffSchools: rows.filter((m) => isStaffRole(m.role)),
          studentSchools: rows.filter((m) => m.role === "student"),
        });
      } catch {
        if (!cancelled) setState({ loading: false, staffSchools: [], studentSchools: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  return state;
}
