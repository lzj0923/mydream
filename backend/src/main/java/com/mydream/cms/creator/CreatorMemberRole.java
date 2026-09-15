package com.mydream.cms.creator;

import java.util.*;
import com.mydream.cms.shared.ApiException;

/** Member presets cannot contain ownership, financial or platform-review powers. */
public record CreatorMemberRole(String key, Set<String> permissions) {
 public static final Set<String> ALLOWED=Set.of("project.edit","video.edit","delivery.submit","traffic.view","traffic.export","cooperation.view","cooperation.edit","contract.summary.view");
 static final Map<String,Set<String>> PRESETS=Map.of(
  "VIEWER",Set.of(),"CREATOR",Set.of("project.edit","video.edit","delivery.submit"),
  "OPERATOR",Set.of("project.edit","video.edit","delivery.submit","traffic.view"),
  "ANALYST",Set.of("traffic.view","traffic.export"),
  "BUSINESS",Set.of("cooperation.view","cooperation.edit","contract.summary.view"));
 public static CreatorMemberRole input(String key,List<String> overrides,boolean edit,boolean upload,boolean submit){
  if(key==null){Set<String> p=new HashSet<>();if(edit)p.add("project.edit");if(upload)p.add("video.edit");if(submit)p.add("delivery.submit");return new CreatorMemberRole(edit&&upload&&submit?"CREATOR":p.isEmpty()?"VIEWER":"CUSTOM",Set.copyOf(p));}
  if(!PRESETS.containsKey(key)&&!key.equals("CUSTOM"))throw ApiException.invalid("成員身份無效");
  if(overrides!=null&&(overrides.size()>ALLOWED.size()||overrides.stream().anyMatch(Objects::isNull)))throw ApiException.invalid("成員權限無效");
  Set<String> p=overrides==null?PRESETS.get(key):new HashSet<>(overrides);
  if(p==null||!ALLOWED.containsAll(p))throw ApiException.invalid("成員權限無效");
  if(p.contains("traffic.export")&&!p.contains("traffic.view")||p.contains("cooperation.edit")&&!p.contains("cooperation.view")||p.contains("delivery.submit")&&!p.contains("video.edit"))throw ApiException.invalid("請同時開放此操作依賴的查看或上傳權限");
  return new CreatorMemberRole(key,Set.copyOf(p));
 }
 public boolean has(String p){return permissions.contains(p);}
 public String extra(){return permissions.stream().filter(p->!Set.of("project.edit","video.edit","delivery.submit").contains(p)).sorted().collect(java.util.stream.Collectors.joining(","));}
}
