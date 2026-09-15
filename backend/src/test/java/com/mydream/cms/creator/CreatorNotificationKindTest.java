package com.mydream.cms.creator;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class CreatorNotificationKindTest {
 @Test void reviewCommentsDoNotChangeNotificationType(){
  assertThat(CreatorWorkflowController.notificationKind("第 2 集 V1：退回修改 · 上架前請修復畫面，同步更新封面")).isEqualTo("RETURNED");
  assertThat(CreatorWorkflowController.notificationKind("第 2 集 V2：驗收通過 · 之前退回的問題已修復")).isEqualTo("APPROVED");
  assertThat(CreatorWorkflowController.notificationKind("第 2 集 V2：驗收通過 · OK\n更多意見")).isEqualTo("APPROVED");
 }
 @Test void materialSubmissionAndPublicationAreDistinguished(){
  assertThat(CreatorWorkflowController.notificationKind("補充資料已提交審核")).isEqualTo("SUBMITTED");
  assertThat(CreatorWorkflowController.notificationKind("補充資料退回修改：通過前請補權屬文件")).isEqualTo("RETURNED");
  assertThat(CreatorWorkflowController.notificationKind("補充資料已確認：可以上架")).isEqualTo("APPROVED");
  assertThat(CreatorWorkflowController.notificationKind("第 1 集 V1 已核對 App 劇集 12")).isEqualTo("PUBLISHED");
  assertThat(CreatorWorkflowController.notificationKind("更新項目上架資料，已上架內容待平台同步")).isEqualTo("SYNC");
 }
}
