import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";

const getAccessToken = async ({ code, state }) => {
  try {
    const response = await axios.post("http://localhost:3001/v1/oauth/line", {
      code,
      state
    });
    return response.data;
  } catch (e) {
    console.error(e.message);
  }
};

const getLineSignInUrl = async () => {
  try {
    const response = await axios.get("http://localhost:3001/v1/oauth/line");
    const { url } = response.data;
    window.location = url;
  } catch (e) {
    console.error(e.message);
  }
};

const Index = () => {
  const router = useRouter();
  const [user, setUser] = useState({});

  useEffect(() => {
    const { code, state } = router.query;
    // Skip.
    if (code == undefined && state == undefined) {
      return;
    }

    getAccessToken({ code, state }).then(res => {
      setUser(res);
      router.push(router.pathname, `/`, { shallow: true });    
    });
  }, [router.query]);

  const handleSigInClicked = useCallback(() => {
    getLineSignInUrl();
  });

  return (
    <div>
      <div>Hello</div>
      <div>{JSON.stringify(user)}</div>
      <button onClick={handleSigInClicked}>Sign in LINE</button>
    </div>
  );
};

export default Index;
