import bcrypt from "bcrypt";

(async () => {
  const password = "Password1!";
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
})();