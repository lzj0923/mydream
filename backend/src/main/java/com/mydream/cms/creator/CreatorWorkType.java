package com.mydream.cms.creator;
import com.mydream.cms.shared.ApiException;
public enum CreatorWorkType {
 COMIC("漫劇"),SHORT_DRAMA("短劇");
 public final String label;
 CreatorWorkType(String label){this.label=label;}
 public static CreatorWorkType parse(String value){try{return valueOf(value);}catch(Exception e){throw ApiException.invalid("請選擇漫劇或短劇");}}
 public String where(String prefix){if(!prefix.equals("")&&!prefix.equals("p."))throw new IllegalArgumentException();return " AND "+prefix+"work_type='"+name()+"'";}
 public void requireFormat(String format){if(!label.equals(format)&&!label.replace('劇','剧').equals(format))throw ApiException.conflict("創作身份已變更，請刷新後在對應身份下建立作品");}
}
