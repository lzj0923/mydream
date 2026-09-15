export function BankIdentityFields({username}:{username:string}) {
  return <>
    <label>當前創作者賬號<input name="username" value={username} readOnly autoComplete="username" aria-describedby="bank-password-help"/></label>
    <label>驗證本人身份（創作者平台登錄密碼）<input name="password" type="password" required maxLength={72} autoComplete="current-password" placeholder="請輸入登錄創作者平台時使用的密碼" aria-describedby="bank-password-help"/></label>
    <p id="bank-password-help" className="ce-field-help">綁定或更換收款銀行卡前，需驗證是您本人操作，防止收款資料被他人修改。這裡填寫的是平台登錄密碼，請勿輸入銀行卡密碼或提款密碼。</p>
  </>;
}
