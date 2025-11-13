export const getApiUrl = (path: string) => {
  if (process.env.NEXT_PUBLIC_SERVER_URL && process.env.NEXT_PUBLIC_SERVER_URL.trim()) {
    return `http://${process.env.NEXT_PUBLIC_SERVER_URL}${path}`;
  }
  return path;
};

export const getReportsApiUrl = (path: string) => {
  if (process.env.NEXT_PUBLIC_API_HOST && process.env.NEXT_PUBLIC_API_HOST.trim() && 
      process.env.NEXT_PUBLIC_API_PORT && process.env.NEXT_PUBLIC_API_PORT.trim()) {
    return `http://${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}${path}`;
  }
  return path;
};