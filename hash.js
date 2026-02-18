import bcrypt from "bcrypt";

const generate = async () => {
  const hash = await bcrypt.hash("Password123!", 10);
  console.log("HASH GENERATO:");
  console.log(hash);
};

generate();

// $2b$10$HmdrL7kXzLRmKpsk7oocbeyBMtljBrWFDuwn921p7WbudENMMTLba