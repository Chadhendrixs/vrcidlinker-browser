import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

function InviteDetail() {
  const { code } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/invite/${code}`)
      .then(res => res.json())
      .then(setData);
  }, [code]);

  if (!data) return <p>Loading...</p>;

  const name = data.guild?.name || data.profile?.name;
  const description = data.guild?.description || data.profile?.description;

  return (
    <div>
      <h1>{name}</h1>
      <p>{description}</p>
      <p>Members: {data.approximate_member_count}</p>
      <p>Tags: {data.custom_tags.join(', ')}</p>
      <a href={`https://discord.gg/${code}`} target="_blank" rel="noreferrer">Join Server</a>
    </div>
  );
}

export default InviteDetail;
